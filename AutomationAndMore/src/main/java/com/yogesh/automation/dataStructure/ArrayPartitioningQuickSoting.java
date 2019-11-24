package com.yogesh.automation.dataStructure;

public class ArrayPartitioningQuickSoting {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		ArrayPartitioningQuickSoting obj = new ArrayPartitioningQuickSoting();
		int[] arr = { -3, 5, -6, 7, 8, 9 };
		obj.partitioning(arr);

		obj.partitioning1(arr);

	}

	// quick sort partitioning
	public void partitioning(int[] arr) {
		int pivot = 0;
		int j = 0;
		int len = arr.length;

		for (int i = 0; i < len; i++) {
			if (arr[i] < pivot) { // checking if arr[i] is negative
				System.out.println("arr[i] " + arr[i]);
				System.out.println("arr[j] " + arr[j]);
				int temp = arr[i];
				arr[i] = arr[j];
				arr[j] = temp;
				j++;
			}
		}
		System.out.println("*****************************************");
		for (int i = 0; i < len; i++) {
			System.out.print(arr[i] + ", ");
		}
	}

	
	public void partitioning1(int[] arr) {
		int pivot = 0;
		int j = 0;
		int len = arr.length;

		for (int i = 0; i < len; i++) {
			if (arr[i]%2 == pivot) { // checking if arr[i] is negative
				System.out.println("arr[i] " + arr[i]);
				System.out.println("arr[j] " + arr[j]);
				int temp = arr[i];
				arr[i] = arr[j];
				arr[j] = temp;
				j++;
			}
		}
		System.out.println("*****************************************");
		for (int i = 0; i < len; i++) {
			System.out.print(arr[i] + ", ");
		}
	}
	
	
}
