package com.yogesh.automation.ObjectiveProgramming;

public class TC05InsertRemoveElementArray {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		Integer[] arr = { 8, 4, 1, 9, 11 };

		// remove element
		System.out.println();
		int removeIndex = 2;

		for (int i = removeIndex; i < arr.length - 1; i++) {
			arr[i] = arr[i + 1];
		}
		System.out.println();

		System.out.println("modified length #" + arr.length);
		for (int i : arr) {
			System.out.print(i + ",");
		}
		System.out.println();

		// insert element
		int insertIndex = 2;
		int dataValueToInsert = 7;

		System.out.println("ori length #" + arr.length);
		for (int i : arr) {
			System.out.print(i + ",");
		}
		System.out.println();

		arr[insertIndex] = dataValueToInsert;
		System.out.println("modified length #" + arr.length);
		for (int i : arr) {
			System.out.print(i + ",");
		}

	}

}
