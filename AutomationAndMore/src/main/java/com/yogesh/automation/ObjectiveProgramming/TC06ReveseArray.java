package com.yogesh.automation.ObjectiveProgramming;

public class TC06ReveseArray {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		TC06ReveseArray obj = new TC06ReveseArray();
		Integer[] arr = { 5, 6, 7, 3, 1, 2 };
		obj.reverserArray(arr);
	}

	public void reverserArray(Integer[] arr) {
		for (int i : arr) {
			System.out.print(i + ",");
		}

		System.out.print("\nReverser is \n");

		int temp=0;
		Integer[] arr1 = new Integer[arr.length];
		for (int i = 0; i < arr.length; i++) {
			arr1[arr.length - i - 1] = arr[i];
		}
		
		for (int i : arr1) {
			System.out.print(i + ",");
		}

	}

}
